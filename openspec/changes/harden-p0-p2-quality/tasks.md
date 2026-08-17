## 1. P0 Security
- [x] 1.1 Confirm secret files are not tracked and ignore secret directories
- [x] 1.2 Replace `<all_urls>` required access with optional runtime host access

## 2. P1 Correctness and injection safety
- [x] 2.1 Preserve model identity when mapping settled Council failures
- [x] 2.2 Aggregate reviews by explicit model identity
- [x] 2.3 Allow only safe Markdown link protocols
- [x] 2.4 Render Content Script messages without HTML interpolation

## 3. P2 Maintainability and privacy
- [x] 3.1 Store API keys in local storage and migrate old sync values
- [x] 3.2 Remove unreachable Legacy Council implementation
- [x] 3.3 Extract security and aggregation utilities from the monolithic app and add automated tests

## 4. Verification
- [x] 4.1 Run JavaScript syntax checks
- [x] 4.2 Run automated tests
- [x] 4.3 Validate OpenSpec strictly
- [x] 4.4 Verify manifest and Git secret tracking state
