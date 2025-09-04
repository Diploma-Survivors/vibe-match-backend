export interface Judge0BatchTestCase {
  source_code: string;
  language_id: number;
  stdin: string;
  cpu_time_limit?: number;
  memory_limit?: number;
  redirect_stderr_to_stdout?: boolean;
}

export interface Judge0BatchSubmissionResponse {
  tokens: string[];
}

export interface Judge0BatchSubmissionResult {
  token: string;
  status_id: number;
  stdout: string;
  stderr?: string;
  time?: string;
  memory?: number;
}
