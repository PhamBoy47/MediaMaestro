package library

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/PhamBoy47/media-maestro/internal/database"
)

var (
	VideoExtensions = []string{".mp4", ".mkv", ".avi", ".webm", ".mov", ".flv", ".wmv"}
	AudioExtensions = []string{".mp3", ".flac", ".ogg", ".wav", ".aac", ".m4a", ".opus"}
)

type Scanner struct {
	db *database.DB
}

func NewScanner(db *database.DB) *Scanner {
	return &Scanner{db: db}
}

func (s *Scanner) ScanDirectory(dirPath string) ([]database.MediaItem, error) {
	var items []database.MediaItem

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip files we can't access
		}
		if info.IsDir() {
			return nil
		}

		ext := strings.ToLower(filepath.Ext(path))
		mediaType := ""
		
		if isExtensionIn(ext, VideoExtensions) {
			mediaType = "video"
		} else if isExtensionIn(ext, AudioExtensions) {
			mediaType = "audio"
		}

		if mediaType != "" {
			item := database.MediaItem{
				ID:        uuid.New().String(),
				Title:     strings.TrimSuffix(info.Name(), filepath.Ext(info.Name())),
				MediaType: mediaType,
				FilePath:  path,
				Metadata:  "{}",
			}
			
			// Save to DB immediately
			if err := s.db.SaveMediaItem(item); err != nil {
				fmt.Printf("Error saving item %s: %v\n", path, err)
			}
			
			items = append(items, item)
		}
		return nil
	})

	return items, err
}

func isExtensionIn(ext string, list []string) bool {
	for _, e := range list {
		if e == ext {
			return true
		}
	}
	return false
}
