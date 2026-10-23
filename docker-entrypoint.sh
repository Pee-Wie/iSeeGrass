#!/bin/bash
set -e

# Fix MPM conflict at runtime — runs inside the live container before Apache starts.
# Remove every mpm_* symlink from mods-enabled, then re-enable only mpm_prefork.
echo "[entrypoint] Fixing Apache MPM configuration..."
rm -f /etc/apache2/mods-enabled/mpm_*.load \
      /etc/apache2/mods-enabled/mpm_*.conf

# Re-enable mpm_prefork (required for mod_php)
ln -sf /etc/apache2/mods-available/mpm_prefork.load \
       /etc/apache2/mods-enabled/mpm_prefork.load
ln -sf /etc/apache2/mods-available/mpm_prefork.conf \
       /etc/apache2/mods-enabled/mpm_prefork.conf

echo "[entrypoint] MPM files in mods-enabled:"
ls /etc/apache2/mods-enabled/mpm_* 2>&1

echo "[entrypoint] Starting Apache..."
exec "$@"
