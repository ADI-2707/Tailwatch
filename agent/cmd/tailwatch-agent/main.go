package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/spf13/cobra"
	"github.com/ADI-2707/Tailwatch/agent/internal/config"
	"github.com/ADI-2707/Tailwatch/agent/internal/pipeline"
)

var configFile string

var rootCmd = &cobra.Command{
	Use:   "tailwatch-agent",
	Short: "Tailwatch static log collection agent",
}

var runCmd = &cobra.Command{
	Use:   "run",
	Short: "Run the agent in foreground",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := config.LoadConfig(configFile)
		if err != nil {
			return fmt.Errorf("loading config: %w", err)
		}

		runner, err := pipeline.NewRunner(cfg)
		if err != nil {
			return fmt.Errorf("initializing runner: %w", err)
		}

		ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
		defer cancel()

		return runner.Start(ctx)
	},
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print agent version",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("tailwatch-agent 1.0.0")
	},
}

func init() {
	runCmd.Flags().StringVarP(&configFile, "config", "c", "tailwatch-agent.yaml", "path to config file")
	rootCmd.AddCommand(runCmd)
	rootCmd.AddCommand(versionCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}
