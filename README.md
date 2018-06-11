# hyper-graph-cli

A small command-line explorer for [hyper-graph databases](https://github.com/e-e-e/hyper-graph-db).

Has a built-in preset to load databases created with [hyper-readings](https://github.com/e-e-e/hyper-reader).

![Screenshot](screenshot.png?raw=true "Screenshot")

## Installation 

    npm install -g hyper-graph-cli

or

    git clone https://github.com/Frando/hyper-graph-cli
    npm install

## Usage

```
hyper-readings-cli browse path/to/db --predidate rdf:type --object hr:root
```

Opens the hypergraph database at that pass. Specify a root (intro) query with one, two or three options out of `--subject`, `--predicate`, `--object`.

or, to directly browse hyper-reader databases

```
hyper-readings-cli hyperreadings
```



