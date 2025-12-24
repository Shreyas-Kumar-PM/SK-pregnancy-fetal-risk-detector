Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://skfetal-risk-frontend.onrender.com'
    )

    resource '*',
             headers: :any,
             methods: %i[get post put patch delete options head],
             expose: ['Authorization'],
             credentials: false
  end
end
