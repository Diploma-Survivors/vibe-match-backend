export interface Judge0SubmissionPayload {
  language_id: number;
  source_code?: string;
  stdin?: string;
  additional_files?: string;
  cpu_time_limit?: number;
  memory_limit?: number;
  redirect_stderr_to_stdout?: boolean;
}

export interface Judge0Status {
  id: number;
  description: string;
}

export interface Judge0Response {
  token: string;
  status: Judge0Status;
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  time?: string;
  memory?: number;
}
