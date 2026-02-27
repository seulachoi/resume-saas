-- 1) 결제 성공인데 fulfilled 안 된 건수 (10분 이상)
select count(*) as paid_stalled_count
from public.ops_paid_stalled;

-- 2) credits 증가(패키지 결제) 후 결과 미생성 의심 케이스
select count(*) as credit_added_no_report_count
from public.ops_credit_added_no_report;

-- 3) webhook 실패율(최근 24h)
select
  measured_at,
  failure_rate,
  failed_events,
  total_events
from public.ops_webhook_failure_rate_1d;

-- 4) generate 실패율(최근 24h)
select
  measured_at,
  failure_rate,
  failed_events,
  total_events
from public.ops_generate_failure_rate_1d;

-- 5) 디버깅용 상세 리스트
select * from public.ops_paid_stalled order by created_at asc limit 100;
select * from public.ops_credit_added_no_report order by created_at desc limit 100;

