import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Alert } from "../components/ui/alert";
import type { AuthPresenterInteractions, AuthPresenterStatus, AuthPresenterViewModel } from "../interfaceAdapters/presenters/useAuthPresenter";

interface AuthViewProps {
  viewModel: AuthPresenterViewModel;
  status: AuthPresenterStatus;
  interactions: AuthPresenterInteractions;
}

const AuthView = ({ viewModel, status, interactions }: AuthViewProps) => {
  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold">Entitle 계정</h1>
        <p className="text-sm text-muted-foreground">신입/멘토 계정을 생성하거나 로그인하세요.</p>
      </header>

      {status.error ? (
        <Alert variant="destructive" className="flex items-start justify-between gap-3">
          <span>{status.error.message}</span>
          <Button variant="ghost" size="sm" onClick={interactions.clearError}>
            닫기
          </Button>
        </Alert>
      ) : null}

      <Tabs defaultValue="register" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="register">회원가입</TabsTrigger>
          <TabsTrigger value="login">로그인</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">이메일</label>
            <Input
              type="email"
              value={viewModel.register.email}
              onChange={(event) => interactions.setRegisterField("email", event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">비밀번호</label>
            <Input
              type="password"
              value={viewModel.register.password}
              onChange={(event) => interactions.setRegisterField("password", event.target.value)}
              placeholder="8자 이상"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">이름</label>
            <Input
              value={viewModel.register.displayName}
              onChange={(event) => interactions.setRegisterField("displayName", event.target.value)}
              placeholder="홍길동"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">역할</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={viewModel.register.role}
              onChange={(event) => interactions.setRegisterField("role", event.target.value)}
            >
              <option value="NEW_HIRE">신입</option>
              <option value="MENTOR">멘토</option>
            </select>
          </div>
          <Button className="w-full" onClick={interactions.submitRegistration} disabled={status.isSubmitting}>
            {status.isSubmitting ? "처리 중..." : "회원가입"}
          </Button>
        </TabsContent>

        <TabsContent value="login" className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">이메일</label>
            <Input
              type="email"
              value={viewModel.login.email}
              onChange={(event) => interactions.setLoginField("email", event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">비밀번호</label>
            <Input
              type="password"
              value={viewModel.login.password}
              onChange={(event) => interactions.setLoginField("password", event.target.value)}
              placeholder="비밀번호"
            />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={interactions.submitLogin} disabled={status.isSubmitting}>
              {status.isSubmitting ? "처리 중..." : "로그인"}
            </Button>
            <Button
              className="flex-1"
              variant="secondary"
              onClick={interactions.submitLogout}
              disabled={status.isSubmitting || !viewModel.session}
            >
              로그아웃
            </Button>
          </div>
          {viewModel.session ? (
            <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs">
              <p className="font-medium">로그인 정보</p>
              <p>사용자 ID: {viewModel.session.userId}</p>
              <p>역할: {viewModel.session.role}</p>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuthView;
