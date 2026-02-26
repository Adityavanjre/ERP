import { Global, Module } from '@nestjs/common';
import { LoggingService } from '../common/services/logging.service';

@Global()
@Module({
    providers: [LoggingService],
    exports: [LoggingService],
})
export class InfrastructureModule { }
