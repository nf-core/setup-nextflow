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
