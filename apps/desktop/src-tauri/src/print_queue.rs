use serde::{Deserialize, Serialize};
use std::sync::Mutex;

const MAX_RETRIES: u32 = 3;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum JobStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "printing")]
    Printing,
    #[serde(rename = "done")]
    Done,
    #[serde(rename = "error")]
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrintJob {
    pub id: String,
    pub label: String,
    pub printer_key: String,
    pub status: JobStatus,
    pub retries: u32,
    pub error_message: Option<String>,
    pub created_at: String,
    #[serde(skip)]
    pub data: Vec<u8>,
}

pub struct PrintQueue {
    jobs: Mutex<Vec<PrintJob>>,
}

impl PrintQueue {
    pub fn new() -> Self {
        PrintQueue {
            jobs: Mutex::new(Vec::new()),
        }
    }

    /// Add a new print job to the queue and process it immediately
    pub fn add_job(&self, label: String, printer_key: String, data: Vec<u8>) -> String {
        let id = format!(
            "pj_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis()
        );

        let now = chrono_now();

        let job = PrintJob {
            id: id.clone(),
            label,
            printer_key: printer_key.clone(),
            status: JobStatus::Pending,
            retries: 0,
            error_message: None,
            created_at: now,
            data: data.clone(),
        };

        {
            let mut jobs = self.jobs.lock().unwrap();
            jobs.push(job);
        }

        // Process the job immediately
        self.process_job(&id, &printer_key, &data);

        id
    }

    fn process_job(&self, job_id: &str, printer_key: &str, data: &[u8]) {
        // Mark as printing
        {
            let mut jobs = self.jobs.lock().unwrap();
            if let Some(job) = jobs.iter_mut().find(|j| j.id == job_id) {
                job.status = JobStatus::Printing;
            }
        }

        let mut last_error = String::new();
        let mut success = false;

        for attempt in 0..MAX_RETRIES {
            match crate::printer::print_raw(printer_key, data) {
                Ok(()) => {
                    success = true;
                    break;
                }
                Err(e) => {
                    last_error = e;
                    // Update retry count
                    let mut jobs = self.jobs.lock().unwrap();
                    if let Some(job) = jobs.iter_mut().find(|j| j.id == job_id) {
                        job.retries = attempt + 1;
                    }
                    // Brief pause between retries
                    std::thread::sleep(std::time::Duration::from_millis(500));
                }
            }
        }

        // Update final status
        let mut jobs = self.jobs.lock().unwrap();
        if let Some(job) = jobs.iter_mut().find(|j| j.id == job_id) {
            if success {
                job.status = JobStatus::Done;
                job.error_message = None;
            } else {
                job.status = JobStatus::Error;
                job.error_message = Some(last_error);
            }
        }
    }

    /// Get all jobs (without raw data, for serialization)
    pub fn get_queue(&self) -> Vec<PrintJob> {
        let jobs = self.jobs.lock().unwrap();
        jobs.clone()
    }

    /// Clear completed and failed jobs
    pub fn clear_queue(&self) {
        let mut jobs = self.jobs.lock().unwrap();
        jobs.retain(|j| j.status == JobStatus::Pending || j.status == JobStatus::Printing);
    }
}

fn chrono_now() -> String {
    let duration = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = duration.as_secs();
    let hours = (secs % 86400) / 3600;
    let minutes = (secs % 3600) / 60;
    let seconds = secs % 60;
    format!("{:02}:{:02}:{:02}", hours, minutes, seconds)
}
