ARG JSREPORT_VERSION=4.14.2
FROM jsreport/jsreport:${JSREPORT_VERSION}

COPY jsreport-mjml-to-html.tgz /tmp/jsreport-mjml-to-html.tgz
RUN npm install --omit=dev /tmp/jsreport-mjml-to-html.tgz
