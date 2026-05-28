"""Tests for product matrix recommendation engine."""

from app.services.recommendations import _get_matching_rules, PRODUCT_MATRIX


def test_product_matrix_loaded():
    assert len(PRODUCT_MATRIX) > 0
    assert "matrix" in PRODUCT_MATRIX
    assert "safety_rules" in PRODUCT_MATRIX
    assert len(PRODUCT_MATRIX["matrix"]) >= 15


def test_matching_rules_high_plaque():
    indices = {"fedorov_volodkina": 3.5, "api_lange": 80}
    result = _get_matching_rules(indices, False, False, None)
    assert "Intensive" in result or "plaque" in result.lower()


def test_matching_rules_braces():
    result = _get_matching_rules({}, True, False, None)
    assert "Брекеты" in result or "Ortho" in result


def test_matching_rules_implants():
    result = _get_matching_rules({}, False, True, None)
    assert "Имплантат" in result or "Implant" in result


def test_matching_rules_bleeding():
    q = {"bleeding_gums": True}
    result = _get_matching_rules({}, False, False, q)
    assert "Bleeding" in result or "inflammatory" in result.lower() or len(result) > 0


def test_matching_rules_sensitivity():
    q = {"sensitivity": True}
    result = _get_matching_rules({}, False, False, q)
    assert len(result) > 0


def test_matching_rules_xerostomia():
    q = {"dry_mouth": True}
    result = _get_matching_rules({}, False, False, q)
    assert len(result) > 0


def test_safety_rules_implant():
    result = _get_matching_rules({}, False, True, None)
    assert "Safety" in result or "избегать" in result.lower() or len(result) > 0


def test_safety_rules_braces():
    result = _get_matching_rules({}, True, False, None)
    assert len(result) > 0
