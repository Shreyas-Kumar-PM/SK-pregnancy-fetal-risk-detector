Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins 'http://localhost:3001', 'https://*.netlify.app'
    resource '*',
             headers: :any,
             methods: %i[get post put patch delete options head],
             expose: %w[Authorization]
  end
end
