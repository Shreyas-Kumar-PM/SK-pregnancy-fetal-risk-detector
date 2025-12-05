Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins '*'  # for dev; restrict later in production
    resource '*',
             headers: :any,
             methods: [:get, :post, :put, :patch, :delete, :options, :head]
  end
end
