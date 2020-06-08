/** Dependencies **/
import {
  AsyncTemplateFunction,
  ClientFunction,
  compile,
  TemplateFunction,
} from 'ejs';
import { get } from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
import * as inlineCss from 'inline-css';

/** Interfaces **/
import { MailerOptions } from '../interfaces/mailer-options.interface';
import { TemplateAdapter } from '../interfaces/template-adapter.interface';

export class EjsAdapter implements TemplateAdapter {
  private precompiledTemplates: {
    [name: string]: TemplateFunction | AsyncTemplateFunction | ClientFunction;
  } = {};

  public compile(mail: any, callback: any, mailerOptions: MailerOptions): void {
    const templateExt = path.extname(mail.data.template) || '.ejs';
    const templateName = path.basename(
      mail.data.template,
      path.extname(mail.data.template),
    );
    const templateDir =
      path.dirname(mail.data.template) !== '.'
        ? path.dirname(mail.data.template)
        : get(mailerOptions, 'template.dir', '');
    const templatePath = path.join(templateDir, templateName + templateExt);

    if (!this.precompiledTemplates[templateName]) {
      try {
        const template = fs.readFileSync(templatePath, 'utf-8');

        this.precompiledTemplates[templateName] = compile(template, {
          ...get(mailerOptions, 'template.options', {}),
          filename: templatePath,
        });
      } catch (err) {
        return callback(err);
      }
    }

    const rendered = this.precompiledTemplates[templateName](mail.data.context);

    const render = (html: string) => {
      inlineCss(html, { url: ' ' }).then((html) => {
        mail.data.html = html;
        return callback();
      });
    };

    if (typeof rendered === 'string') {
      render(rendered);
    } else {
      rendered.then(render);
    }
  }
}
