package main

import (
	"os"

	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/cli"
)

func main() {
	os.Exit(cli.Run(os.Args, os.Stdout, os.Stderr))
}
