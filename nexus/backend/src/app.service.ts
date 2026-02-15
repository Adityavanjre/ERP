import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Nexus ERP Engine v2.0 is Online 🟢';
  }
}
