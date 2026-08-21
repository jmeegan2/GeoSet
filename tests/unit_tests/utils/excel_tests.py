# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

from datetime import date, datetime, timezone
from unittest.mock import patch

import pandas as pd
from pandas.api.types import is_numeric_dtype

from superset.utils.core import GenericDataType
from superset.utils.excel import apply_column_types, df_to_excel


def test_timezone_conversion() -> None:
    """
    Test that columns with timezones are converted to a string.
    """
    df = pd.DataFrame({"dt": [datetime(2023, 1, 1, 0, 0, tzinfo=timezone.utc)]})
    apply_column_types(df, [GenericDataType.TEMPORAL])
    contents = df_to_excel(
        df,
        writer_kwargs={
            "engine_kwargs": {"options": {"constant_memory": True}},
        },
    )
    assert pd.read_excel(contents)["dt"][0] == "2023-01-01 00:00:00+00:00"


def test_quote_formulas() -> None:
    """
    Test that formulas are quoted in Excel.
    """
    df = pd.DataFrame({"formula": ["=SUM(A1:A2)", "normal", "@SUM(A1:A2)"]})
    contents = df_to_excel(df)
    assert pd.read_excel(contents)["formula"].tolist() == [
        "'=SUM(A1:A2)",
        "normal",
        "'@SUM(A1:A2)",
    ]


def test_column_data_types_with_one_numeric_column():
    df = pd.DataFrame(
        {
            "col0": ["123", "1", "2", "3"],
            "col1": ["456", "5.67", "0", ".45"],
            "col2": [
                datetime(2023, 1, 1, 0, 0, tzinfo=timezone.utc),
                datetime(2023, 1, 2, 0, 0, tzinfo=timezone.utc),
                datetime(2023, 1, 3, 0, 0, tzinfo=timezone.utc),
                datetime(2023, 1, 4, 0, 0, tzinfo=timezone.utc),
            ],
            "col3": ["True", "False", "True", "False"],
        }
    )
    coltypes: list[GenericDataType] = [
        GenericDataType.STRING,
        GenericDataType.NUMERIC,
        GenericDataType.TEMPORAL,
        GenericDataType.BOOLEAN,
    ]

    # only col1 should be converted to numeric, according to coltypes definition
    assert not is_numeric_dtype(df["col1"])
    apply_column_types(df, coltypes)
    assert not is_numeric_dtype(df["col0"])
    assert is_numeric_dtype(df["col1"])
    assert not is_numeric_dtype(df["col2"])
    assert not is_numeric_dtype(df["col3"])


def test_column_data_types_with_failing_conversion():
    df = pd.DataFrame(
        {
            "col0": ["123", "1", "2", "3"],
            "col1": ["456", "non_numeric_value", "0", ".45"],
            "col2": [
                datetime(2023, 1, 1, 0, 0, tzinfo=timezone.utc),
                datetime(2023, 1, 2, 0, 0, tzinfo=timezone.utc),
                datetime(2023, 1, 3, 0, 0, tzinfo=timezone.utc),
                datetime(2023, 1, 4, 0, 0, tzinfo=timezone.utc),
            ],
            "col3": ["True", "False", "True", "False"],
        }
    )
    coltypes: list[GenericDataType] = [
        GenericDataType.STRING,
        GenericDataType.NUMERIC,
        GenericDataType.TEMPORAL,
        GenericDataType.BOOLEAN,
    ]

    # should not fail neither convert
    assert not is_numeric_dtype(df["col1"])
    apply_column_types(df, coltypes)
    assert not is_numeric_dtype(df["col0"])
    assert not is_numeric_dtype(df["col1"])
    assert not is_numeric_dtype(df["col2"])
    assert not is_numeric_dtype(df["col3"])


def test_column_data_types_with_large_numeric_values():
    df = pd.DataFrame(
        {
            "big_number": [
                10**14,
                999999999999999,
                10**15 + 1,
                10**16,
                1100108628127863,
                2**54,
            ],
        }
    )
    apply_column_types(df, [GenericDataType.NUMERIC])
    assert df["big_number"].tolist() == [
        100000000000000,
        999999999999999,
        "1000000000000001",
        "10000000000000000",
        "1100108628127863",
        "18014398509481984",
    ]


def test_df_to_excel_passes_writer_kwargs() -> None:
    df = pd.DataFrame(
        {
            "name": ["first", "second", "third"],
            "url": [
                "https://example.com/1",
                "https://example.com/2",
                "https://example.com/3",
            ],
            "value": [10, 20, 30],
        }
    )
    writer_kwargs = {
        "engine_kwargs": {
            "options": {
                "strings_to_urls": False,
            },
        },
    }

    with patch("superset.utils.excel.pd.ExcelWriter", wraps=pd.ExcelWriter) as writer:
        contents = df_to_excel(df, writer_kwargs=writer_kwargs)

    result = pd.read_excel(contents, index_col=0)

    pd.testing.assert_frame_equal(result, df)
    assert writer.call_args.kwargs["engine_kwargs"] == writer_kwargs["engine_kwargs"]


def test_df_to_excel_preserves_dates() -> None:
    df = pd.DataFrame(
        {
            "date": [date(2024, 1, 2), date(2025, 3, 4)],
            "datetime": [
                datetime(2024, 1, 2, 3, 4, 5),
                datetime(2025, 3, 4, 5, 6, 7),
            ],
        }
    )

    with patch(
        "superset.utils.excel_optimized_for_large_exports."
        "EXCEL_CONSTANT_MEMORY_ROW_THRESHOLD",
        1,
    ):
        contents = df_to_excel(df)
    result = pd.read_excel(contents, index_col=0)

    assert result["date"].dt.date.tolist() == df["date"].tolist()
    assert result["datetime"].tolist() == df["datetime"].tolist()


def test_df_to_excel_uses_pandas_below_constant_memory_threshold() -> None:
    df = pd.DataFrame({"first": [1, 2, 3], "second": [4, 5, 6]})

    with patch(
        "superset.utils.excel.pd.DataFrame.to_excel", wraps=df.to_excel
    ) as export:
        contents = df_to_excel(df)

    pd.testing.assert_frame_equal(pd.read_excel(contents, index_col=0), df)
    export.assert_called_once()


def test_df_to_excel_falls_back_for_unsupported_values() -> None:
    df = pd.DataFrame({"value": [{"key": "value"}, [1, 2], float("inf")]})

    with patch(
        "superset.utils.excel_optimized_for_large_exports."
        "EXCEL_CONSTANT_MEMORY_ROW_THRESHOLD",
        1,
    ):
        contents = df_to_excel(df)

    assert pd.read_excel(contents, index_col=0)["value"].tolist() == [
        "{'key': 'value'}",
        "[1, 2]",
        "inf",
    ]


def test_df_to_excel_falls_back_for_unsupported_options() -> None:
    df = pd.DataFrame({"value": [1, 2, 3]})

    with patch(
        "superset.utils.excel_optimized_for_large_exports."
        "EXCEL_CONSTANT_MEMORY_ROW_THRESHOLD",
        1,
    ):
        contents = df_to_excel(
            df,
            freeze_panes=(1, 0),
        )

    pd.testing.assert_frame_equal(pd.read_excel(contents, index_col=0), df)
