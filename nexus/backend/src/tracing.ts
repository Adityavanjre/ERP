import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { resourceFromAttributes } from '@opentelemetry/resources';

// For troubleshooting, set the log level to DiagLogLevel.DEBUG
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const otlpExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
});

export const otracing = new NodeSDK({
    resource: resourceFromAttributes({
        [SemanticResourceAttributes.SERVICE_NAME]: 'nexus-backend',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
    traceExporter: otlpExporter,
    instrumentations: [getNodeAutoInstrumentations({
        // Disable fs instrumentation as it can be very noisy
        '@opentelemetry/instrumentation-fs': {
            enabled: false,
        },
    })],
});

// Graceful shutdown
process.on('SIGTERM', () => {
    otracing.shutdown()
        .then(() => console.log('Tracing terminated'))
        .catch((error) => console.log('Error terminating tracing', error))
        .finally(() => process.exit(0));
});
