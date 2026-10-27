FROM php:8.2-apache-bullseye

# ── PHP extensions ────────────────────────────────────────────────────────────
RUN docker-php-ext-install mysqli pdo pdo_mysql

# ── PHP production settings ───────────────────────────────────────────────────
# Disable display_errors so warnings never corrupt JSON API responses.
# Log errors instead (visible in Railway deploy logs via stderr).
# Raise upload limits for seagrass photos (default 2MB is too small).
RUN echo "display_errors = Off"        >> /usr/local/etc/php/conf.d/iseegrass.ini \
 && echo "log_errors = On"             >> /usr/local/etc/php/conf.d/iseegrass.ini \
 && echo "error_log = /dev/stderr"     >> /usr/local/etc/php/conf.d/iseegrass.ini \
 && echo "upload_max_filesize = 20M"   >> /usr/local/etc/php/conf.d/iseegrass.ini \
 && echo "post_max_size = 22M"         >> /usr/local/etc/php/conf.d/iseegrass.ini \
 && echo "max_execution_time = 120"    >> /usr/local/etc/php/conf.d/iseegrass.ini

# ── Apache config ─────────────────────────────────────────────────────────────
# Enable mod_rewrite and mod_alias (needed for Alias directive)
RUN a2enmod rewrite alias

# Copy our custom VirtualHost config:
# - DocumentRoot → www/   (front-end)
# - Alias /core → core/  (PHP API, one level up from www/)
# This eliminates the redirect loop from root .htaccess
COPY docker/apache-railway.conf /etc/apache2/sites-available/000-default.conf

# Allow .htaccess overrides globally
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# ── Fix MPM at runtime via custom entrypoint ──────────────────────────────────
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# ── Application code ──────────────────────────────────────────────────────────
COPY . /var/www/html/

# Remove entrypoint script from web root
RUN rm -f /var/www/html/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["apache2-foreground"]
