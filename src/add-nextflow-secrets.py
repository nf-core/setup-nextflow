#!/usr/bin/env python
import os
import subprocess

NEXTFLOW = os.environ["INPUT_NEXTFLOW"]
SECRETS = os.environ.get("INPUT_SECRETS")

if SECRETS is None:
    exit(0)

for secret in SECRETS.strip().split("\n"):
    key = secret.split("=")[0]
    val = "".join(secret.split("=")[1:])

    subprocess.run([f"{NEXTFLOW}/nextflow", "secrets", "set", key, val])

# Note: no `main()` function is implemented here and no doctests are written
# here because is intentionally non-functional and non-deterministic.
# Technically mocks and stubs could be used, but that would increase the
# complexity of this simple action, and would only really test if our mocks and
# stubs are working properly. In other words, I am allergic to mocks and stubs
# after watching Gary Bernhardt's talk "Boundaries."
