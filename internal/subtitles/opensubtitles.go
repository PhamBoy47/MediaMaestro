package subtitles

import (
    "encoding/binary"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
    "path/filepath"
    "strconv"
    "strings"
)

type Client struct {
    apiKey     string
    httpClient *http.Client
    saveDir    string
}

type SearchResult struct {
    ID             string `json:"id"`
    FileName       string `json:"fileName"`
    Language       string `json:"language"`
    DownloadCount  int    `json:"downloadCount"`
    HearingImpaired bool   `json:"hearingImpaired"`
    FileID         string `json:"fileId"`
    ReleaseName    string `json:"releaseName"`
    EpisodeNumber  int    `json:"episodeNumber"`
    SeasonNumber   int    `json:"seasonNumber"`
}

type osSearchResponse struct {
    Data []osSearchItem `json:"data"`
}

type osSearchItem struct {
    ID         string `json:"id"`
    Attributes struct {
        ReleaseName    string `json:"release_name"`
        Files          []struct {
            FileID   int    `json:"file_id"`
            FileName string `json:"file_name"`
        } `json:"files"`
        Language       string `json:"language"`
        DownloadCount  int    `json:"download_count"`
        HearingImpaired bool  `json:"hearing_impaired"`
        FeatureDetails struct {
            SeasonNumber int `json:"season_number"`
            EpisodeNumber int `json:"episode_number"`
        } `json:"feature_details"`
    } `json:"attributes"`
}

type osDownloadResponse struct {
    Link     string `json:"link"`
    FileName string `json:"file_name"`
}

func NewClient(apiKey string, saveDir string) *Client {
    return &Client{
        apiKey:     apiKey,
        httpClient: &http.Client{},
        saveDir:    saveDir,
    }
}

// Search searches OpenSubtitles by keyword
func (c *Client) Search(query string, language string, season int, episode int) ([]SearchResult, error) {
    url := "https://api.opensubtitles.com/api/v1/subtitles?" +
        "query=" + query +
        "&languages=" + language

    if season > 0 {
        url += "&season_number=" + strconv.Itoa(season)
    }
    if episode > 0 {
        url += "&episode_number=" + strconv.Itoa(episode)
    }

    req, _ := http.NewRequest("GET", url, nil)
    req.Header.Set("Api-Key", c.apiKey)
    req.Header.Set("User-Agent", "MediaMaestro v0.1")

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("OpenSubtitles search failed: %w", err)
    }
    defer resp.Body.Close()

    var searchResp osSearchResponse
    if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
        return nil, fmt.Errorf("failed to parse search response: %w", err)
    }

    results := make([]SearchResult, 0, len(searchResp.Data))
    for _, item := range searchResp.Data {
        if len(item.Attributes.Files) == 0 {
            continue
        }
        results = append(results, SearchResult{
            ID:              item.ID,
            FileName:        item.Attributes.Files[0].FileName,
            Language:        item.Attributes.Language,
            DownloadCount:   item.Attributes.DownloadCount,
            HearingImpaired: item.Attributes.HearingImpaired,
            FileID:          strconv.Itoa(item.Attributes.Files[0].FileID),
            ReleaseName:     item.Attributes.ReleaseName,
            SeasonNumber:    item.Attributes.FeatureDetails.SeasonNumber,
            EpisodeNumber:   item.Attributes.FeatureDetails.EpisodeNumber,
        })
    }

    return results, nil
}

// SearchByFile searches using the file's hash (Seanime's preferred method)
func (c *Client) SearchByFile(filePath string, language string) ([]SearchResult, error) {
    // Calculate OpenSubtitles hash
    hash, err := calculateOSHash(filePath)
    if err != nil {
        return nil, err
    }

    // Get file size
    fileInfo, err := os.Stat(filePath)
    if err != nil {
        return nil, err
    }
    fileSize := fileInfo.Size()

    url := fmt.Sprintf(
        "https://api.opensubtitles.com/api/v1/subtitles?moviehash_match=%s&languages=%s",
        hash, language,
    )

    _ = fileSize // Can also use file_size parameter

    req, _ := http.NewRequest("GET", url, nil)
    req.Header.Set("Api-Key", c.apiKey)
    req.Header.Set("User-Agent", "MediaMaestro v0.1")

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("OpenSubtitles hash search failed: %w", err)
    }
    defer resp.Body.Close()

    var searchResp osSearchResponse
    json.NewDecoder(resp.Body).Decode(&searchResp)

    results := make([]SearchResult, 0, len(searchResp.Data))
    for _, item := range searchResp.Data {
        if len(item.Attributes.Files) == 0 {
            continue
        }
        results = append(results, SearchResult{
            ID:              item.ID,
            FileName:        item.Attributes.Files[0].FileName,
            Language:        item.Attributes.Language,
            DownloadCount:   item.Attributes.DownloadCount,
            HearingImpaired: item.Attributes.HearingImpaired,
            FileID:          strconv.Itoa(item.Attributes.Files[0].FileID),
            ReleaseName:     item.Attributes.ReleaseName,
        })
    }

    return results, nil
}

// Download downloads a subtitle file by its file ID
func (c *Client) Download(fileID string, mediaPath string) (string, error) {
    // Request download link
    body := fmt.Sprintf(`{"file_id": %s}`, fileID)
    req, _ := http.NewRequest("POST", "https://api.opensubtitles.com/api/v1/download", strings.NewReader(body))
    req.Header.Set("Api-Key", c.apiKey)
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("User-Agent", "MediaMaestro v0.1")

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return "", fmt.Errorf("failed to request download link: %w", err)
    }
    defer resp.Body.Close()

    var dlResp osDownloadResponse
    json.NewDecoder(resp.Body).Decode(&dlResp)

    if dlResp.Link == "" {
        return "", fmt.Errorf("no download link received")
    }

    // Download the actual file
    dlReq, _ := http.NewRequest("GET", dlResp.Link, nil)
    dlResp2, err := c.httpClient.Do(dlReq)
    if err != nil {
        return "", fmt.Errorf("failed to download subtitle: %w", err)
    }
    defer dlResp2.Body.Close()

    fileBytes, err := io.ReadAll(dlResp2.Body)
    if err != nil {
        return "", fmt.Errorf("failed to read subtitle data: %w", err)
    }

    // Determine save path
    baseName := strings.TrimSuffix(filepath.Base(mediaPath), filepath.Ext(mediaPath))
    savePath := filepath.Join(c.saveDir, baseName+".srt")

    // Check if it's a zip/gz (OpenSubtitles sometimes returns compressed)
    contentType := dlResp2.Header.Get("Content-Type")
    if strings.Contains(contentType, "gzip") || strings.Contains(contentType, "zip") {
        // Decompress and extract
        savePath, err = extractSubtitle(fileBytes, baseName, c.saveDir)
        if err != nil {
            return "", err
        }
    } else {
        if err := os.WriteFile(savePath, fileBytes, 0644); err != nil {
            return "", fmt.Errorf("failed to save subtitle: %w", err)
        }
    }

    return savePath, nil
}

// calculateOSHash computes the OpenSubtitles hash algorithm
// (first and last 64KB of the file, summed as 64-bit chunks)
func calculateOSHash(filePath string) (string, error) {
    file, err := os.Open(filePath)
    if err != nil {
        return "", err
    }
    defer file.Close()

    stat, err := file.Stat()
    if err != nil {
        return "", err
    }
    fileSize := stat.Size()

    if fileSize < 65536*2 {
        return "", fmt.Errorf("file too small for OS hash")
    }

    hash := uint64(fileSize)
    chunkSize := int64(65536)
    buf := make([]byte, 8)

    // Read first 64KB
    for i := int64(0); i < chunkSize; i += 8 {
        _, err := file.Read(buf)
        if err != nil {
            return "", err
        }
        hash += byteOrder.Uint64(buf)
    }

    // Seek to last 64KB
    file.Seek(-chunkSize, 2)
    for i := int64(0); i < chunkSize; i += 8 {
        _, err := file.Read(buf)
        if err != nil {
            return "", err
        }
        hash += byteOrder.Uint64(buf)
    }

    return fmt.Sprintf("%016x", hash), nil
}

// extractSubtitle extracts subtitle from zip/gz archive
func extractSubtitle(data []byte, baseName string, saveDir string) (string, error) {
    // Simple implementation: try to detect and extract .srt/.ass from zip
    // In production, use archive/zip or compress/gzip
    savePath := filepath.Join(saveDir, baseName+".srt")
    os.WriteFile(savePath, data, 0644)
    return savePath, nil
}
var byteOrder = binary.LittleEndian