package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "tailwatch-agent",
	Short: "Tailwatch static log collection agent",
}

var runCmd = &cobra.Command{
	Use:   "run",
	Short: "Run the agent in foreground",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Starting Tailwatch Agent...")
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
	rootCmd.AddCommand(runCmd)
	rootCmd.AddCommand(versionCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}
