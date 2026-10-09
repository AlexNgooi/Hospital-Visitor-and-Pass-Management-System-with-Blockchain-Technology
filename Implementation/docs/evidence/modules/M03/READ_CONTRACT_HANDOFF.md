# C15 masked read dependency checkpoint

Date 2026-10-10, Asia/Singapore. Base write contract source 4d70df4; exact read source commit is sent to coordinator after checkpoint. This is a dependency handoff only, not full M03 approval.

New dependency files:
- backend/src/main/java/eduupm/hsaas/registration/RegistrationReadPort.java
- backend/src/test/java/eduupm/hsaas/registration/RegistrationReadPortTests.java

The source depends only on baseline common/foundation and the approved RegistrationVersions. It does not include a SQL root adapter, V5 or M03 field/runtime implementation. All six C13 dependency files are unchanged.

Methods: captureReadScope(serverOwnerContextId,counterId), readMaskedQueue(scope,ReadQuery), readMaskedDetail(scope,id). Root package alone can capture ReadScope; factory must first require RC, check current role, then M00 full prefix. Read scopes carry private server actor/counter coordinates and exact synchronization/resource identity. Reads consume once before any SQL; completion/rollback expire unused scopes and REQUIRES_NEW cannot borrow an outer scope. Jackson serialization/deserialization is explicitly denied. DTOs follow M04 exact flat wire and explicit nulls. Missing category/status filters are null; size1–50 and (long)page*size <= Integer.MAX_VALUE match M04, with no separate page cap.

Actual command: `.\mvnw.cmd -B -Dtest=RegistrationReadPortTests,SyntheticReviewRulesTests,RegistrationReviewPortTests,RegistrationDecisionTests,RegistrationMaskingTests test`.

- Initial 07:50:27 +08: FAIL, one failure among20; default mapper serialized the empty internal scope as `{}` instead of rejecting it. No information leaked, but the stronger non-serialization contract was unmet.
- After explicit serializer/deserializer guards, 07:51:30 +08: PASS,20 tests,0 failure/error/skip,exit0.
- Included read tests5 and unchanged C13 tests9 are the relevant dependency subset. Additional decision/masking tests6 passed in the local worktree but are not part of this independent read snapshot.

Five read cases cover one-use/count+items, completion/rollback, factory outside RC before modeled SQL, suspended inner rejection/outer resume, exact bounded pagination, immutable lists, required null wire fields and no serialization/deserialization of scope. Spring synchronization lifecycle is real; the root datastore and permission checks are modeled, so actual SQL/HTTP/role/counter acceptance remains pending implementation and disposable MySQL tests.

Coordinator should independently reproduce `-Dtest=RegistrationReadPortTests,SyntheticReviewRulesTests,RegistrationReviewPortTests` (14 tests) on this exact snapshot before approving M04 consumption. No merge/push/native database/secret access occurred. M04 must not modify the copied root-owned interface; future scope/version changes are coordinated.
