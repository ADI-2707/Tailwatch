package config

import (
	"fmt"
	"os"
	"regexp"
	"time"

	"gopkg.in/yaml.v3"
)

type ServerConfig struct {
	URL      string `yaml:"url"`
	APIKey   string `yaml:"api_key"`
	Insecure bool   `yaml:"insecure_skip_verify"`
}

type HostConfig struct {
	Name   string            `yaml:"name"`
	Fields map[string]string `yaml:"fields"`
}

type FileSourceConfig struct {
	Type     string   `yaml:"type"`
	Paths    []string `yaml:"paths"`
	Service  string   `yaml:"service"`
	StartAt  string   `yaml:"start_at"`
}

type BatchConfig struct {
	MaxEvents   int           `yaml:"max_events"`
	MaxBytes    int           `yaml:"max_bytes"`
	MaxAge      time.Duration `yaml:"max_age"`
	Compression string        `yaml:"compression"`
}

type SpoolConfig struct {
	Dir     string `yaml:"dir"`
	MaxSize int64  `yaml:"max_size_mb"`
	OnFull  string `yaml:"on_full"`
}

type Config struct {
	Server  ServerConfig       `yaml:"server"`
	Host    HostConfig         `yaml:"host"`
	Sources []FileSourceConfig `yaml:"sources"`
	Batch   BatchConfig        `yaml:"batch"`
	Spool   SpoolConfig        `yaml:"spool"`
}

var envPattern = regexp.MustCompile(`\$\{([A-Za-z0-9_]+)\}`)

func expandEnv(content []byte) []byte {
	return envPattern.ReplaceAllFunc(content, func(match []byte) []byte {
		envName := string(match[2 : len(match)-1])
		return []byte(os.Getenv(envName))
	})
}

func LoadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading config file: %w", err)
	}

	expanded := expandEnv(data)

	cfg := &Config{
		Batch: BatchConfig{
			MaxEvents:   2000,
			MaxBytes:    2 * 1024 * 1024,
			MaxAge:      1 * time.Second,
			Compression: "zstd",
		},
		Spool: SpoolConfig{
			Dir:     "/var/lib/tailwatch/spool",
			MaxSize: 1024,
			OnFull:  "block",
		},
	}

	if err := yaml.Unmarshal(expanded, cfg); err != nil {
		return nil, fmt.Errorf("unmarshaling config yaml: %w", err)
	}

	if cfg.Server.URL == "" {
		return nil, fmt.Errorf("server.url is required")
	}
	if cfg.Server.APIKey == "" {
		return nil, fmt.Errorf("server.api_key is required")
	}

	if cfg.Host.Name == "" {
		hostname, err := os.Hostname()
		if err == nil {
			cfg.Host.Name = hostname
		} else {
			cfg.Host.Name = "unknown"
		}
	}

	return cfg, nil
}
