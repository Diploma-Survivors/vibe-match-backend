import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PaginationCursorDto } from '../dtos/pagination-cursor.dto';

export const VALID_CURSOR_PAGINATION = 'ValidCursorPagination';

@ValidatorConstraint({ name: VALID_CURSOR_PAGINATION, async: false })
export class ValidCursorPagination implements ValidatorConstraintInterface {
  validate(
    _value: any,
    validationArguments?: ValidationArguments,
  ): Promise<boolean> | boolean {
    const obj = validationArguments?.object as PaginationCursorDto;
    if (obj.first && !obj.after && !obj.last && !obj.before) {
      return true;
    }

    const firstOrLastOnly = !!obj.first !== !!obj.last;
    const afterOrBeforeOnly = !!obj.after !== !!obj.before;
    const firstAndAfter = obj?.first ? !!obj.after : true;
    const lastAndBefore = obj?.last ? !!obj.before : true;

    return (
      firstOrLastOnly && afterOrBeforeOnly && firstAndAfter && lastAndBefore
    );
  }

  defaultMessage(): string {
    return 'If you use forward pagination, you must provide "first" and "after" is optional. If you use backward pagination, you must provide "last" and "before". You cannot mix "first" with "last" or "after" with "before".';
  }
}
