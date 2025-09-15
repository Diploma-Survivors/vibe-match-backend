import { SetMetadata } from '@nestjs/common';

export const SKIP_DATA_RESPONSE = 'skipDataResponse';
export const SkipDataResponse = () => SetMetadata(SKIP_DATA_RESPONSE, true);
