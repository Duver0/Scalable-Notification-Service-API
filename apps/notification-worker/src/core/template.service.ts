import { Injectable } from "@nestjs/common";
import { NotificationChannel, Template } from "@app/common";

@Injectable()
export class TemplateService {
  private readonly templates: Map<string, Template> = new Map([
    [
      "welcome-email",
      {
        id: "welcome-email",
        channel: NotificationChannel.EMAIL,
        subject: "Welcome, {{name}}!",
        body: "Hello {{name}}, welcome to our platform!",
        variables: ["name"],
      },
    ],
    [
      "welcome-sms",
      {
        id: "welcome-sms",
        channel: NotificationChannel.SMS,
        subject: "",
        body: "Hi {{name}}, welcome!",
        variables: ["name"],
      },
    ],
    [
      "reset-password",
      {
        id: "reset-password",
        channel: NotificationChannel.EMAIL,
        subject: "Password Reset",
        body: "Click here to reset: {{link}}",
        variables: ["link"],
      },
    ],
    [
      "notification",
      {
        id: "notification",
        channel: NotificationChannel.EMAIL,
        subject: "Notification: {{subject}}",
        body: "{{message}}",
        variables: ["subject", "message"],
      },
    ],
    [
      "welcome-push",
      {
        id: "welcome-push",
        channel: NotificationChannel.PUSH,
        subject: "Welcome, {{name}}!",
        body: "Hello {{name}}, welcome to our platform!",
        variables: ["name"],
      },
    ],
  ]);

  findById(id: string): Template | undefined {
    return this.templates.get(id);
  }

  render(
    template: Template,
    variables: Record<string, string>,
  ): { subject: string; body: string } {
    let subject = template.subject;
    let body = template.body;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      subject = subject.replace(placeholder, value);
      body = body.replace(placeholder, value);
    }

    return { subject, body };
  }
}
