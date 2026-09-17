package covercheck

import (
	"bufio"
	"bytes"
	"fmt"
	"path"
	"strconv"
	"strings"
)

type Thresholds struct {
	Total   float64
	Package float64
}

type Report struct {
	Pass     bool
	Total    float64
	Packages map[string]float64
	Covered  int
	Stmts    int
}

func Evaluate(profile []byte, t Thresholds) (Report, error) {
	sc := bufio.NewScanner(bytes.NewReader(profile))
	if !sc.Scan() {
		return Report{}, fmt.Errorf("covercheck: empty profile")
	}
	if !strings.HasPrefix(sc.Text(), "mode:") {
		return Report{}, fmt.Errorf("covercheck: missing mode line")
	}

	type acc struct{ covered, stmts int }
	pkgs := map[string]*acc{}
	total := acc{}
	lines := 0
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" {
			continue
		}
		file, stmts, count, err := parseBlock(line)
		if err != nil {
			return Report{}, err
		}
		lines++
		pkg := path.Dir(strings.ReplaceAll(file, `\`, "/"))
		if pkgs[pkg] == nil {
			pkgs[pkg] = &acc{}
		}
		pkgs[pkg].stmts += stmts
		total.stmts += stmts
		if count > 0 {
			pkgs[pkg].covered += stmts
			total.covered += stmts
		}
	}
	if lines == 0 || total.stmts == 0 {
		return Report{}, fmt.Errorf("covercheck: profile has no statement blocks")
	}

	rep := Report{
		Packages: map[string]float64{},
		Covered:  total.covered,
		Stmts:    total.stmts,
		Total:    float64(total.covered) / float64(total.stmts),
	}
	pass := rep.Total >= t.Total
	for name, a := range pkgs {
		ratio := float64(a.covered) / float64(a.stmts)
		rep.Packages[name] = ratio
		if ratio < t.Package {
			pass = false
		}
	}
	rep.Pass = pass
	return rep, nil
}

func parseBlock(line string) (file string, stmts, count int, err error) {
	// <file>:<line>.<col>,<line>.<col> <numStmts> <count>
	fields := strings.Fields(line)
	if len(fields) < 3 {
		return "", 0, 0, fmt.Errorf("covercheck: malformed line %q", line)
	}
	stmtsStr := fields[len(fields)-2]
	countStr := fields[len(fields)-1]
	fileWithRange := strings.Join(fields[:len(fields)-2], " ")

	colon := strings.LastIndex(fileWithRange, ":")
	if colon <= 0 {
		return "", 0, 0, fmt.Errorf("covercheck: malformed line %q", line)
	}
	file = fileWithRange[:colon]
	stmts, err = strconv.Atoi(stmtsStr)
	if err != nil {
		return "", 0, 0, fmt.Errorf("covercheck: malformed statement count in %q", line)
	}
	count, err = strconv.Atoi(countStr)
	if err != nil {
		return "", 0, 0, fmt.Errorf("covercheck: malformed hit count in %q", line)
	}
	return file, stmts, count, nil
}
