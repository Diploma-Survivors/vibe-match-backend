// Third-party imports
import { Validate } from 'class-validator';
import { ValidationOptions } from 'joi';

// Relative imports
import { IsGreaterThanValidator } from '../validators/is-greater-than.validator';

export function IsGreaterThan<T>(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return Validate(IsGreaterThanValidator<T>, [property], validationOptions);
}
