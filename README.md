# fmma-npm-commander

A library for creating command line executables in typescript.

## How to use clink auto-completions

Requirements:

1. Clink v1.3.46
2. clink-completions https://github.com/vladimir-kotikov/clink-completions

Copy completions folder to somewhere. Let's call it `<PATH_TO_COMPLETIONS>`.
Add it to clink with command `clink installscripts <PATH_TO_COMPLETIONS>` (IMPORTANT: Make sure clink-completions have been added to clink first)

For each fmma-commander-command that you wish to install completions for, run the command with the special argument `@tabc` and an additional argument like so:

```<COMMAND_NAME> @tabc genscript```

Restart terminal and test if completions work.

For custom arguments, place a file under `<PATH_TO_COMPLETIONS>/args`. You'll have to generate the arg files yourself. I found on-the-fly generation of completions way too slow using node and sockets (the tabc-server/client thing).
The file can be generated for all arguments of a command by running

```<COMMAND_NAME> @tabc genargs```
