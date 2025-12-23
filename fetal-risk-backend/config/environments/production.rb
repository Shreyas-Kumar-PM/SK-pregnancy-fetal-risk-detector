require "active_support/core_ext/integer/time"

Rails.application.configure do
  # Do not reload code between requests.
  config.enable_reloading = false

  # Eager load code on boot.
  config.eager_load = true

  # Disable full error reports.
  config.consider_all_requests_local = false

  # Cache assets for far-future expiry.
  config.public_file_server.headers = {
    "cache-control" => "public, max-age=#{1.year.to_i}"
  }

  # Active Storage (local is fine for Render free tier)
  config.active_storage.service = :local

  # Logging
  config.log_tags = [:request_id]
  config.logger   = ActiveSupport::TaggedLogging.logger(STDOUT)
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")

  # Silence health check logs
  config.silence_healthcheck_path = "/up"

  # Disable deprecation logs
  config.active_support.report_deprecations = false

  # ✅ IMPORTANT: Explicit cache store (NO Solid)
  config.cache_store = :memory_store

  # ✅ IMPORTANT: Explicit job adapter (NO Solid)
  config.active_job.queue_adapter = :async

  # Mailer
  config.action_mailer.raise_delivery_errors = false
  config.action_mailer.default_url_options = {
    host: ENV.fetch("APP_HOST", "localhost")
  }

  # I18n
  config.i18n.fallbacks = true

  # ActiveRecord
  config.active_record.dump_schema_after_migration = false
  config.active_record.attributes_for_inspect = [:id]

  # ✅ Disable Action Cable completely
  config.action_cable.mount_path = nil
  config.action_cable.disable_request_forgery_protection = true
end
