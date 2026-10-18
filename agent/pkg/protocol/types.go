package protocol

import "time"

type LogEvent struct {
	TS      time.Time              `json:"ts"`
	Level   string                 `json:"level"`
	Service string                 `json:"service"`
	Host    string                 `json:"host,omitempty"`
	Source  string                 `json:"source,omitempty"`
	Message string                 `json:"message"`
	Fields  map[string]interface{} `json:"fields,omitempty"`
	TraceID string                 `json:"trace_id,omitempty"`
	Seq     int64                  `json:"seq,omitempty"`
}

type AgentMetadata struct {
	Host    string `json:"host"`
	Version string `json:"version"`
}

type IngestBatch struct {
	BatchID string        `json:"batch_id"`
	Agent   AgentMetadata `json:"agent"`
	Events  []LogEvent    `json:"events"`
}
