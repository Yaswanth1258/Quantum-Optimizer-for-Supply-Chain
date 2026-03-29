def build_comparison_metrics(classical_cost: float, quantum_cost: float) -> dict:
    cost_difference = classical_cost - quantum_cost
    if classical_cost == 0:
        improvement_pct = 0.0
    else:
        improvement_pct = (cost_difference / classical_cost) * 100.0

    return {
        "cost_difference": round(cost_difference, 4),
        "efficiency_improvement_pct": round(improvement_pct, 4),
    }
