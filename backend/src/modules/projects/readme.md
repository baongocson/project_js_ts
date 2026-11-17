# ProjectsModule

BE-2 triển khai đủ 6 API project/workspace, dùng global AuthGuard/OwnershipGuard của BE-1. Guard scaffold không dùng đã được bỏ; quyền do global guards và service ownership xác minh.

Trạng thái triển khai và lệnh nghiệm thu ở [báo cáo BE-2](../../../../docs/teamwork/nguyen-be2.md).

`projects.service` điều phối receipt, transaction fence, workspace CAS và cleanup/recovery. `projects.repository` sở hữu ghi projects/workspaces. `project-state.service/module` cung cấp participant bindImport cho Datasets. `workspace-normalization` bỏ refs không hợp lệ, clamp trang theo snapshot hiện tại và trả adjustments; GET không ghi database. No-op PATCH giữ revision/updatedAt, stale revision/base trả409. Delete đánh dấu deleting, gọi AccountCleanupService và chỉ204 sau khi dọn xong; worker startup/60giây phục hồi marker.

Kiểm chứng nghiệp vụ thật: `npm run test:be2:local -w backend`. Không dùng test DB-disabled để nghiệm thu CRUD.
