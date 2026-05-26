"""Tests for dental index calculations."""

from app.services.index_calculator import (
    calculate_indices,
    calc_fedorov_volodkina,
    calc_api_lange,
    calc_ohi_s,
    calc_silness_loe,
    calc_php,
    interpret_fedorov,
    interpret_api,
    interpret_ohi_s,
    interpret_silness_loe,
    interpret_php,
)


class TestFedorovVolodkina:
    def test_zero_plaque(self):
        assert calc_fedorov_volodkina(0) == 1.0

    def test_low_plaque(self):
        val = calc_fedorov_volodkina(10)
        assert 1.0 < val <= 2.0

    def test_medium_plaque(self):
        val = calc_fedorov_volodkina(40)
        assert 2.0 < val <= 4.0

    def test_high_plaque(self):
        val = calc_fedorov_volodkina(100)
        assert val == 5.0

    def test_interpretation_good(self):
        assert interpret_fedorov(1.2) == "Хороший"

    def test_interpretation_satisfactory(self):
        assert interpret_fedorov(1.8) == "Удовлетворительный"

    def test_interpretation_poor(self):
        assert interpret_fedorov(3.0) == "Плохой"

    def test_interpretation_very_poor(self):
        assert interpret_fedorov(4.5) == "Очень плохой"


class TestAPILange:
    def test_with_zone_data(self):
        zones = {"upper_left": 30, "upper_right": 40, "lower_left": 20, "lower_right": 10}
        val = calc_api_lange(20, 30, 25, zones)
        assert val == 25.0

    def test_without_zone_data(self):
        val = calc_api_lange(20, 30, 25)
        assert val > 0

    def test_interpretation(self):
        assert interpret_api(10) == "Хороший"
        assert interpret_api(30) == "Удовлетворительный"
        assert interpret_api(50) == "Неудовлетворительный"
        assert interpret_api(80) == "Плохой"


class TestOHIS:
    def test_zero(self):
        assert calc_ohi_s(0, 0, 0) == 0.0

    def test_max(self):
        assert calc_ohi_s(100, 100, 100) == 3.0

    def test_interpretation(self):
        assert interpret_ohi_s(0.3) == "Хороший"
        assert interpret_ohi_s(1.0) == "Удовлетворительный"
        assert interpret_ohi_s(2.5) == "Плохой"


class TestSilnessLoe:
    def test_zero(self):
        assert calc_silness_loe(0, 0, 0) == 0.0

    def test_max(self):
        assert calc_silness_loe(100, 100, 100) == 3.0

    def test_interpretation(self):
        assert interpret_silness_loe(0.0) == "Отличный"
        assert interpret_silness_loe(0.5) == "Хороший"
        assert interpret_silness_loe(1.5) == "Удовлетворительный"
        assert interpret_silness_loe(2.5) == "Неудовлетворительный"


class TestPHP:
    def test_zero(self):
        assert calc_php(0, 0, 0) == 0.0

    def test_max(self):
        assert calc_php(100, 100, 100) == 5.0

    def test_with_zones(self):
        zones = {"upper_left": 50, "upper_center": 30, "upper_right": 10,
                 "lower_left": 20, "lower_center": 40, "lower_right": 60}
        val = calc_php(30, 40, 20, zones)
        assert 0 < val <= 5

    def test_interpretation(self):
        assert interpret_php(0.0) == "Отличный"
        assert interpret_php(0.3) == "Хороший"
        assert interpret_php(1.0) == "Удовлетворительный"
        assert interpret_php(2.0) == "Неудовлетворительный"


class TestCalculateIndices:
    def test_all_indices_returned(self):
        result = calculate_indices(20, 30, 25)
        assert hasattr(result, "fedorov_volodkina")
        assert hasattr(result, "api_lange")
        assert hasattr(result, "ohi_s")
        assert hasattr(result, "silness_loe")
        assert hasattr(result, "php")
        assert hasattr(result, "fedorov_interpretation")
        assert hasattr(result, "silness_loe_interpretation")
        assert hasattr(result, "php_interpretation")

    def test_zero_plaque(self):
        result = calculate_indices(0, 0, 0)
        assert result.fedorov_volodkina == 1.0
        assert result.ohi_s == 0.0
        assert result.silness_loe == 0.0
        assert result.php == 0.0
