# app/controllers/api/v1/reports_controller.rb
require "prawn"

module Api
  module V1
    class ReportsController < ApplicationController
      before_action :authorize_request

      # GET /api/v1/patients/:patient_id/report
      def show
        # Your app has user.patient (singular)
        patient = current_user.patient

        # Ensure this patient belongs to the logged in user and IDs match
        unless patient && patient.id.to_s == params[:patient_id].to_s
          render json: { error: "Patient not found" }, status: :not_found
          return
        end

        last_reading = patient.readings.order(recorded_at: :desc).first
        last_risk    = patient.risk_evaluations.order(created_at: :desc).first

        # Build PDF in memory
        pdf = Prawn::Document.new(page_size: "A4", margin: 40)

        # ===== HEADER =====
        pdf.text safe_str("Maternal-Fetal Risk Report"),
                 size: 20,
                 style: :bold,
                 align: :center
        pdf.move_down 16

        # ===== PATIENT DETAILS =====
        pdf.text safe_str("Patient Details"), size: 14, style: :bold
        pdf.move_down 6

        pdf.text safe_str("Name: #{patient.name.presence || 'N/A'}")
        age = patient.respond_to?(:age) ? patient.age : nil
        pdf.text safe_str("Age: #{age || 'N/A'}")

        gest_weeks =
          if patient.respond_to?(:gestation_weeks)
            patient.gestation_weeks
          elsif patient.respond_to?(:gestation)
            patient.gestation
          end
        pdf.text safe_str("Gestation: #{gest_weeks || 'N/A'} weeks")
        pdf.move_down 14

        # ===== LATEST READING =====
        pdf.text safe_str("Latest Vital Reading"), size: 14, style: :bold
        pdf.move_down 6

        if last_reading
          rec_time = last_reading.recorded_at&.strftime("%d %b %Y, %I:%M %p")
          pdf.text safe_str("Recorded at: #{rec_time || 'N/A'}")
          pdf.move_down 4

          pdf.text safe_str("Fetal HR: #{last_reading.fetal_hr || 'N/A'} bpm")
          pdf.text safe_str("Maternal HR: #{last_reading.maternal_hr || 'N/A'} bpm")
          pdf.text safe_str(
            "Blood Pressure: #{last_reading.systolic_bp || 'N/A'}/" \
            "#{last_reading.diastolic_bp || 'N/A'} mmHg"
          )
          pdf.text safe_str("SpO2: #{last_reading.spo2 || 'N/A'}%")
          pdf.text safe_str("Temperature: #{last_reading.temperature || 'N/A'} °C")
        else
          pdf.text safe_str("No readings found for this patient.")
        end

        pdf.move_down 16

        # ===== RISK ASSESSMENT =====
        pdf.text safe_str("Risk Assessment"), size: 14, style: :bold
        pdf.move_down 6

        if last_risk
          pdf.text safe_str("Risk Level: #{last_risk.risk_level || 'N/A'}")
          pdf.text safe_str("Risk Score: #{last_risk.risk_score || 'N/A'}")
          pdf.move_down 4
          pdf.text safe_str("Reason:"), style: :bold
          pdf.text safe_str(last_risk.reason.presence || "N/A")
        else
          pdf.text safe_str("No risk evaluations recorded yet.")
        end

        pdf.move_down 16
        pdf.text safe_str(
          "Note: This report is for screening and monitoring only and " \
          "does not replace professional medical advice."
        ), size: 9, style: :italic

        # Send PDF bytes
        send_data pdf.render,
                  filename: "risk-report-patient-#{patient.id}.pdf",
                  type: "application/pdf",
                  disposition: "attachment"
      rescue => e
        Rails.logger.error("[ReportsController] PDF generation failed: #{e.class} - #{e.message}")
        Rails.logger.error(e.backtrace.first(5).join("\n"))

        error_payload = { error: "Failed to generate report." }
        error_payload[:debug] = "#{e.class}: #{e.message}" if Rails.env.development?

        render json: error_payload, status: :internal_server_error
      end

      private

      # Force all strings into Windows-1252-compatible encoding
      def safe_str(value)
        value.to_s.encode("Windows-1252", invalid: :replace, undef: :replace, replace: "?")
      end
    end
  end
end
