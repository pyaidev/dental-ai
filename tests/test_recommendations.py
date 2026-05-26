"""Tests for recommendation generation."""

import pytest
from app.services.recommendations import _template_recommendations


class TestTemplateRecommendations:
    def test_good_hygiene(self):
        result = _template_recommendations(5, {"upper_center": 3}, False, False)
        assert "хороший" in result.lower()
        assert "6 месяцев" in result

    def test_satisfactory(self):
        result = _template_recommendations(20, {"upper_center": 20}, False, False)
        assert "удовлетворительный" in result.lower()

    def test_poor_hygiene(self):
        result = _template_recommendations(60, {"upper_center": 60}, False, False)
        assert "срочная" in result.lower() or "плохой" in result.lower()

    def test_with_braces(self):
        result = _template_recommendations(30, {"upper_center": 30}, True, False)
        assert "брекет" in result.lower() or "ортодонт" in result.lower()

    def test_with_implants(self):
        result = _template_recommendations(30, {"upper_center": 30}, False, True)
        assert "имплант" in result.lower() or "ирригатор" in result.lower()

    def test_problem_zones(self):
        zones = {"upper_left": 5, "upper_center": 40, "lower_center": 50}
        result = _template_recommendations(30, zones, False, False)
        assert "проблемн" in result.lower()

    def test_no_problem_zones(self):
        zones = {"upper_left": 5, "upper_center": 3, "lower_center": 2}
        result = _template_recommendations(5, zones, False, False)
        assert "не выявлено" in result.lower()

    def test_returns_string(self):
        result = _template_recommendations(25, {}, False, False)
        assert isinstance(result, str)
        assert len(result) > 50
