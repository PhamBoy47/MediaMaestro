package mpv

import (
    "bufio"
    "encoding/json"
    "fmt"
    "io"
    "net"
    "os"
    "sync"
    "sync/atomic"
    "time"
)

// IPCClient communicates with MPV via its JSON IPC protocol.
// This is the exact same approach Seanime uses.
type IPCClient struct {
    socketPath string
    conn       net.Conn
    reader     *bufio.Reader

    requestID  atomic.Int64
    pending    map[int64]chan ipcResponse
    pendingMu  sync.RWMutex

    eventSubs  map[string][]func(interface{})
    eventMu    sync.RWMutex

    propertyObs map[int]propertyObserver
    propObsMu   sync.RWMutex

    connected  atomic.Bool
    closeCh    chan struct{}
    closeOnce  sync.Once

    onConnect    func()
    onDisconnect func()
}

type ipcRequest struct {
    Command   []interface{} `json:"command"`
    RequestID int64         `json:"request_id"`
}

type ipcResponse struct {
    Error     string          `json:"error"`
    RequestID int64           `json:"request_id"`
    Data      json.RawMessage `json:"data"`
}

type ipcEvent struct {
    Event string          `json:"event"`
    Name  string          `json:"name"`
    Data  json.RawMessage `json:"data"`
    ID    int             `json:"id"`
}

type propertyObserver struct {
    name string
    fn   func(interface{})
}

// NewIPCClient creates a new MPV IPC client
func NewIPCClient(socketPath string) *IPCClient {
    return &IPCClient{
        socketPath:   socketPath,
        pending:      make(map[int64]chan ipcResponse),
        eventSubs:    make(map[string][]func(interface{})),
        propertyObs:  make(map[int]propertyObserver),
        closeCh:      make(chan struct{}),
    }
}

// Connect establishes a connection to MPV's IPC socket
func (c *IPCClient) Connect() error {
    // Wait for socket file to exist (MPV creates it on startup)
    maxRetries := 50
    for i := 0; i < maxRetries; i++ {
        if _, err := os.Stat(c.socketPath); err == nil {
            break
        }
        if i == maxRetries-1 {
            return fmt.Errorf("MPV IPC socket not found at %s after waiting", c.socketPath)
        }
        time.Sleep(100 * time.Millisecond)
    }

    conn, err := net.DialTimeout("unix", c.socketPath, 5*time.Second)
    if err != nil {
        return fmt.Errorf("failed to connect to MPV IPC: %w", err)
    }

    c.conn = conn
    c.reader = bufio.NewReader(conn)
    c.connected.Store(true)

    // Start reading responses/events
    go c.readLoop()

    // Re-register property observers on reconnect
    c.propObsMu.RLock()
    for id, obs := range c.propertyObs {
        c.observePropertyDirect(obs.name, id)
    }
    c.propObsMu.RUnlock()

    if c.onConnect != nil {
        c.onConnect()
    }

    return nil
}

// readLoop reads JSON messages from the IPC socket
func (c *IPCClient) readLoop() {
    defer c.connected.Store(false)

    for {
        select {
        case <-c.closeCh:
            return
        default:
        }

        // MPV sends one JSON object per line
        line, err := c.reader.ReadBytes('\n')
        if err != nil {
            if err == io.EOF {
                // MPV closed the connection
                if c.onDisconnect != nil {
                    c.onDisconnect()
                }
                return
            }
            continue
        }

        var raw map[string]json.RawMessage
        if err := json.Unmarshal(line, &raw); err != nil {
            continue
        }

        // Determine if this is a response or an event
        if _, ok := raw["event"]; ok {
            c.handleEvent(raw)
        } else {
            c.handleResponse(raw)
        }
    }
}

// handleResponse routes a command response to the pending caller
func (c *IPCClient) handleResponse(raw map[string]json.RawMessage) {
    var resp ipcResponse
    // Re-marshal and un-marshal to get the full struct
    data, _ := json.Marshal(raw)
    json.Unmarshal(data, &resp)

    c.pendingMu.RLock()
    ch, ok := c.pending[resp.RequestID]
    c.pendingMu.RUnlock()

    if ok {
        ch <- resp
        c.pendingMu.Lock()
        delete(c.pending, resp.RequestID)
        c.pendingMu.Unlock()
    }
}

// handleEvent dispatches MPV events to subscribers
func (c *IPCClient) handleEvent(raw map[string]json.RawMessage) {
    eventName := ""
    if n, ok := raw["event"]; ok {
        json.Unmarshal(n, &eventName)
    }

    // Handle property-change events specially
    if eventName == "property-change" {
        var evt ipcEvent
        data, _ := json.Marshal(raw)
        json.Unmarshal(data, &evt)

        c.propObsMu.RLock()
        if obs, ok := c.propertyObs[evt.ID]; ok {
            var value interface{}
            json.Unmarshal(evt.Data, &value)
            obs.fn(value)
        }
        c.propObsMu.RUnlock()
    }

    // Dispatch to event subscribers
    c.eventMu.RLock()
    handlers, ok := c.eventSubs[eventName]
    c.eventMu.RUnlock()

    if ok {
        var data interface{}
        if d, exists := raw["data"]; exists {
            json.Unmarshal(d, &data)
        }
        for _, handler := range handlers {
            go handler(data)
        }
    }
}

// SendCommand sends a command to MPV and waits for the response
func (c *IPCClient) SendCommand(args ...interface{}) (json.RawMessage, error) {
    if !c.connected.Load() {
        return nil, fmt.Errorf("not connected to MPV")
    }

    id := c.requestID.Add(1)
    req := ipcRequest{
        Command:   args,
        RequestID: id,
    }

    ch := make(chan ipcResponse, 1)
    c.pendingMu.Lock()
    c.pending[id] = ch
    c.pendingMu.Unlock()

    data, err := json.Marshal(req)
    if err != nil {
        return nil, err
    }
    data = append(data, '\n')

    if _, err := c.conn.Write(data); err != nil {
        c.pendingMu.Lock()
        delete(c.pending, id)
        c.pendingMu.Unlock()
        return nil, fmt.Errorf("failed to send command: %w", err)
    }

    select {
    case resp := <-ch:
        if resp.Error != "success" {
            return nil, fmt.Errorf("MPV error: %s", resp.Error)
        }
        return resp.Data, nil
    case <-time.After(10 * time.Second):
        c.pendingMu.Lock()
        delete(c.pending, id)
        c.pendingMu.Unlock()
        return nil, fmt.Errorf("MPV command timed out")
    }
}

// SetProperty sets an MPV property
func (c *IPCClient) SetProperty(name string, value interface{}) error {
    _, err := c.SendCommand("set_property", name, value)
    return err
}

// GetProperty retrieves an MPV property
func (c *IPCClient) GetProperty(name string) (interface{}, error) {
    data, err := c.SendCommand("get_property", name)
    if err != nil {
        return nil, err
    }
    var value interface{}
    json.Unmarshal(data, &value)
    return value, nil
}

// GetFloatProperty retrieves a float MPV property
func (c *IPCClient) GetFloatProperty(name string) (float64, error) {
    data, err := c.SendCommand("get_property", name)
    if err != nil {
        return 0, err
    }
    var value float64
    json.Unmarshal(data, &value)
    return value, nil
}

// ObserveProperty registers a callback for property changes
func (c *IPCClient) ObserveProperty(name string, callback func(interface{})) int {
    id := len(c.propertyObs) + 1

    c.propObsMu.Lock()
    c.propertyObs[id] = propertyObserver{name: name, fn: callback}
    c.propObsMu.Unlock()

    if c.connected.Load() {
        c.observePropertyDirect(name, id)
    }

    return id
}

func (c *IPCClient) observePropertyDirect(name string, id int) {
    c.SendCommand("observe_property", id, name)
}

// OnEvent registers a handler for a specific MPV event
func (c *IPCClient) OnEvent(eventName string, handler func(interface{})) {
    c.eventMu.Lock()
    defer c.eventMu.Unlock()
    c.eventSubs[eventName] = append(c.eventSubs[eventName], handler)
}

// Close shuts down the IPC connection
func (c *IPCClient) Close() {
    c.closeOnce.Do(func() {
        close(c.closeCh)
        if c.conn != nil {
            c.conn.Close()
        }
    })
}

// IsConnected returns the connection state
func (c *IPCClient) IsConnected() bool {
    return c.connected.Load()
}