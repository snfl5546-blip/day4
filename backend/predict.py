"""
predict.py — ③ 머신러닝: 다음 1시간 미세먼지 예측
DB에 쌓인 '지난 몇 시간 값'을 보고 '다음 시간 값'을 맞히도록
선형회귀를 그 자리에서 학습시킨다. (numpy 최소제곱법: scikit-learn LinearRegression 과 같은 수식)
  입력(X) = 직전 3시간 PM10   →   정답(y) = 그다음 시간 PM10
"""
import numpy as np

from collect import grade_pm10

LAGS = 3          # 직전 몇 시간을 볼지
MIN_POINTS = 12   # 최소 몇 개가 쌓여야 학습할지


def _fit(X, y):
    """y ≈ w1*x1 + w2*x2 + w3*x3 + b 의 w, b 를 최소제곱법으로 찾는다."""
    A = np.hstack([np.array(X, dtype=float), np.ones((len(X), 1))])   # 마지막 열 = 절편(b)
    coef, *_ = np.linalg.lstsq(A, np.array(y, dtype=float), rcond=None)
    return coef


def _predict(coef, X):
    A = np.hstack([np.array(X, dtype=float), np.ones((len(X), 1))])
    return A @ coef


def predict_next(history: list[dict]) -> dict:
    vals = [h["pm10"] for h in history if h.get("pm10") is not None]
    if len(vals) < MIN_POINTS:
        return {"ready": False, "points": len(vals),
                "message": f"데이터가 {MIN_POINTS}개 이상 쌓여야 예측할 수 있어요 (지금 {len(vals)}개)"}

    # 학습 문제 만들기: [t-3, t-2, t-1] → t
    X = [vals[i - LAGS:i] for i in range(LAGS, len(vals))]
    y = vals[LAGS:]

    # 마지막 6개는 시험용으로 빼서 '얼마나 틀리는지' 먼저 잰다
    test = 6
    coef = _fit(X[:-test], y[:-test])
    errors = np.abs(_predict(coef, X[-test:]) - np.array(y[-test:], dtype=float))
    mae = float(errors.mean())

    # 전체로 다시 학습 → 다음 시간 예측
    coef = _fit(X, y)
    nxt = max(0, round(float(_predict(coef, [vals[-LAGS:]])[0])))
    return {
        "ready": True,
        "points": len(vals),
        "recent": vals[-12:],
        "next_pm10": nxt,
        "next_grade": grade_pm10(nxt),
        "avg_error": round(mae, 1),
        "model": f"선형회귀 numpy(직전 {LAGS}시간 → 다음 1시간)",
    }
