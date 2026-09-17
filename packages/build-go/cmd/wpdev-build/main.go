package main

import (
	"io"
	"os"

	"github.com/abolfazl-moeini/wp-starter-kit/packages/build-go/internal/cli"
)

var (
	osExit           = os.Exit
	stdout io.Writer = os.Stdout
	stderr io.Writer = os.Stderr
	args             = os.Args
)

func main() {
	osExit(cli.Run(args, stdout, stderr))
}
