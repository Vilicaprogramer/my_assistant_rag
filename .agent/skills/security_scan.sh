#!/bin/bash
echo "Running Security Scan..."
if grep -rn "eval(" app/; then
  echo "Security Alert: eval() usage detected!"
  exit 1
fi
if grep -rn "exec(" app/; then
  echo "Security Alert: exec() usage detected!"
  exit 1
fi
echo "Security Audit: SUCCESS. No vulnerabilities found."
exit 0
