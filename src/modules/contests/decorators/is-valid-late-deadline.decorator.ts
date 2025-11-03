// Third-party imports
import { Validate } from 'class-validator';
import { ValidationOptions } from 'joi';

// Relative imports
import { IsValidLateDeadlineValidator } from '../validators/is-valid-late-deadline.validator';

export function IsValidLateDeadline(
  property?: string,
  validationOptions?: ValidationOptions,
) {
  return Validate(IsValidLateDeadlineValidator, [property], validationOptions);
}
