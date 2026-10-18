package mask

import (
	"regexp"
	"strings"
)

type Masker struct {
	patterns []*regexp.Regexp
}

var defaultPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)(eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})`),
	regexp.MustCompile(`(AKIA[0-9A-Z]{16})`),
	regexp.MustCompile(`(?i)(bearer\s+[a-zA-Z0-9_\-\.]{15,})`),
	regexp.MustCompile(`(ghp_[0-9a-zA-Z]{36}|xoxb-[0-9a-zA-Z\-]{24,})`),
	regexp.MustCompile(`(?i)-----BEGIN[ A-Z0-9_-]+PRIVATE KEY-----`),
	regexp.MustCompile(`\b(?:\d{4}[-\s]?){3}\d{4}\b`),
}

var sensitiveFieldKeys = []string{
	"password",
	"passwd",
	"secret",
	"token",
	"authorization",
	"auth",
	"api_key",
	"apikey",
	"private_key",
}

func NewMasker(customPatterns []string) (*Masker, error) {
	compiled := make([]*regexp.Regexp, 0, len(defaultPatterns)+len(customPatterns))
	compiled = append(compiled, defaultPatterns...)

	for _, p := range customPatterns {
		re, err := regexp.Compile(p)
		if err != nil {
			return nil, err
		}
		compiled = append(compiled, re)
	}

	return &Masker{patterns: compiled}, nil
}

func (m *Masker) MaskText(text string) string {
	res := text
	for _, re := range m.patterns {
		res = re.ReplaceAllString(res, "[REDACTED]")
	}
	return res
}

func (m *Masker) MaskFields(fields map[string]interface{}) map[string]interface{} {
	if fields == nil {
		return nil
	}

	masked := make(map[string]interface{}, len(fields))
	for k, v := range fields {
		isSensitive := false
		lowerKey := strings.ToLower(k)
		for _, sens := range sensitiveFieldKeys {
			if strings.Contains(lowerKey, sens) {
				isSensitive = true
				break
			}
		}

		if isSensitive {
			masked[k] = "[REDACTED]"
		} else {
			if strVal, ok := v.(string); ok {
				masked[k] = m.MaskText(strVal)
			} else {
				masked[k] = v
			}
		}
	}
	return masked
}
