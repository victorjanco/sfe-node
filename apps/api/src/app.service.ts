import { Injectable } from '@nestjs/common';
import { generateControlCode } from '@sfe/core';

export interface ControlCodeInput {
  authorizationNumber: string;
  invoiceNumber: string;
  nit: string;
  date: string;
  amount: string;
  dosageKey: string;
}

@Injectable()
export class AppService {
  generateControlCode(input: ControlCodeInput): string {
    return generateControlCode(
      input.authorizationNumber,
      input.invoiceNumber,
      input.nit,
      input.date,
      input.amount,
      input.dosageKey,
    );
  }
}