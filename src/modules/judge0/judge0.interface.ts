export interface Judge0SubmissionPayload {
  language_id: number;
  source_code?: string;
  stdin?: string;
  additional_files?: string;
  cpu_time_limit?: number;
  memory_limit?: number;
  redirect_stderr_to_stdout?: boolean;
  callback_url?: string;
}

export interface Judge0Status {
  id: number;
  description: string;
}

export interface Judge0Response {
  token: string;
  stdout?: string;
  time?: number;
  memory?: number;
  stderr?: string;
  compile_output?: string;
  message?: string;
  status: Judge0Status;
}

export type Judge0BatchResponse = Array<{ token: string }>;
