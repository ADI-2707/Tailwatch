package mask

import (
	"strings"
	"testing"
)

func TestMaskText(t *testing.T) {
	masker, err := NewMasker(nil)
	if err != nil {
		t.Fatalf("unexpected error creating masker: %v", err)
	}

	tests := []struct {
		input    string
		contains string
	}{
		{
			input:    "failed with bearer secret-token-1234567890-test in call",
			contains: "[REDACTED]",
		},
		{
			input:    "using aws key AKIAIOSFODNN7EXAMPLE to upload",
			contains: "[REDACTED]",
		},
		{
			input:    "card 4111-2222-3333-4444 charged",
			contains: "[REDACTED]",
		},
	}

	for _, tt := range tests {
		masked := masker.MaskText(tt.input)
		if !strings.Contains(masked, tt.contains) {
			t.Errorf("expected '%s' to contain '%s', got '%s'", tt.input, tt.contains, masked)
		}
	}
}

func TestMaskFields(t *testing.T) {
	masker, err := NewMasker(nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	fields := map[string]interface{}{
		"api_key":   "sensitive-12345",
		"service":   "billing",
		"auth_code": "secret-auth",
	}

	masked := masker.MaskFields(fields)
	if masked["api_key"] != "[REDACTED]" {
		t.Errorf("expected api_key to be [REDACTED], got %v", masked["api_key"])
	}
	if masked["auth_code"] != "[REDACTED]" {
		t.Errorf("expected auth_code to be [REDACTED], got %v", masked["auth_code"])
	}
	if masked["service"] != "billing" {
		t.Errorf("expected service to be billing, got %v", masked["service"])
	}
}

