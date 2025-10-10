import { Validate, ValidationOptions } from 'class-validator';
import { IsLessThanValidator } from '../validators/is-less-than.validator';

export function IsLessThan<T>(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return Validate(IsLessThanValidator<T>, [property], validationOptions);
}
