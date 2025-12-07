class AlertMailer < ApplicationMailer
  default from: ENV["SMTP_EMAIL"]

  def risk_alert(user, patient, reading, evaluation)
    @user = user
    @patient = patient
    @reading = reading
    @evaluation = evaluation

    mail(
      to: user.email,
      subject: "⚠️ Fetal Risk Alert — #{evaluation['risk_level'].upcase} level detected"
    )
  end
end
