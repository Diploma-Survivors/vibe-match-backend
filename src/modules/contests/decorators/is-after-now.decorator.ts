import { Validate, ValidationOptions } from 'class-validator';
import { IsAfterNowValidator } from '../validators/is-after-now.validator';

export function IsAfterNow(validationOptions?: ValidationOptions) {
  return Validate(IsAfterNowValidator, [], validationOptions);
}
