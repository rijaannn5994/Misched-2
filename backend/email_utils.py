import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "MiSched")


def send_email(to_address: str, subject: str, html_body: str) -> bool:
    """Send a single HTML email. Returns True on success, False on failure."""
    if not SMTP_USER or not SMTP_PASSWORD or SMTP_PASSWORD == "your-app-password":
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{EMAIL_FROM_NAME} <{SMTP_USER}>"
    msg["To"] = to_address
    msg.attach(MIMEText(html_body, "html"))

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, to_address, msg.as_string())
        return True
    except Exception:
        return False


def build_lecture_reminder_html(student_name: str, lectures: list[dict]) -> str:
    rows = ""
    for lec in lectures:
        rows += f"""
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">{lec['module']}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">{lec['date']}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">{lec['start']} – {lec['end']}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">{lec['room']}</td>
        </tr>"""

    return f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;
                  box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden;">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;">
          <h1 style="color:#fff;margin:0;font-size:22px;">MiSched – Upcoming Lecture Reminder</h1>
        </div>
        <div style="padding:28px 32px;">
          <p style="color:#374151;font-size:15px;">Hi <strong>{student_name}</strong>,</p>
          <p style="color:#374151;font-size:15px;">
            You have the following lecture(s) coming up. Remember to check in when you arrive!
          </p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:10px 12px;text-align:left;color:#475569;">Module</th>
                <th style="padding:10px 12px;text-align:left;color:#475569;">Date</th>
                <th style="padding:10px 12px;text-align:left;color:#475569;">Time</th>
                <th style="padding:10px 12px;text-align:left;color:#475569;">Room</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
          <p style="color:#64748b;font-size:13px;margin-top:24px;">
            This is an automated reminder from MiSched. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>"""
