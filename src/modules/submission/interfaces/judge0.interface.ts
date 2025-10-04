export interface Judge0BatchSubmissionResponse {
  tokens: string[];
}

export interface Judge0BatchSubmissionResult {
  token: string;
  status_id: number;
  stdout: string;
  stderr: string;
  time: string;
  memory: number;
}

export interface Judge0BatchTestCase {
  source_code: string;
  language_id: number;
  stdin: string;
}
